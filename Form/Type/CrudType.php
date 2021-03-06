<?php

namespace Hexmedia\AdministratorBundle\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilder;
use Symfony\Component\Form\FormBuilderInterface;

abstract class CrudType extends AbstractType
{
    /**
     * @param FormBuilderInterface $builder
     * @param array $options
     * @return mixed
     *
     * @deprecated override buildForm instead
     */
    protected function doBuildForm(FormBuilderInterface $builder, array $options) {}

    public function buildForm(FormBuilderInterface $builder, array $options)
    {
        $this->doBuildForm($builder, $options);
    }

    protected function addButtons(FormBuilderInterface $builder)
    {
        $builder
            ->add(
                'save',
                'submit',
                [
                    'label' => 'Save',
                    'attr' => [
                        'class' => 'btn-primary',
                        'data-loading-text' => 'Saving ...'
                    ]
                ]
            )
            ->add(
                'saveAndExit',
                'submit',
                [
                    'label' => 'Save & Exit',
                    'attr' => [
                        'class' => 'btn-primary',
                        'data-loading-text' => 'Saving ...'
                    ]
                ]
            );
    }

    protected function addPublished(FormBuilderInterface $builder)
    {
        $builder
            ->add(
                'saveAndPublish',
                'submit',
                [
                    'label' => 'Save & Publish',
                    'attr' => [
                        'class' => 'btn-primary',
                        'data-loading-text' => 'Saving and publishing ...'
                    ]
                ]
            )
            ->add(
                'published',
                'publication'
            )
            ->add(
                'publishedFrom',
                'datepicker',
                [
                    'label' => 'From',
                ]
            )
            ->add(
                'publishedTo',
                'datepicker',
                [
                    'label' => 'To',
                ]
            );
    }

    protected function addSeo(FormBuilderInterface $builder)
    {

        $builder
            ->add(
                'seoTitle',
                null,
                [
                    'label' => 'Title',
                    'render_optional_text' => false,
                    'required' => false
                ]
            )
            ->add(
                'seoKeywords',
                null,
                [
                    'label' => 'Keywords',
                    'render_optional_text' => false,
                    'required' => false
                ]
            )
            ->add(
                'seoDescription',
                'textarea',
                [
                    'required' => false,
                    'label' => 'Description',
                    'render_optional_text' => false,
                ]
            );
    }

    protected function addDeleteButton(FormBuilderInterface $builder)
    {
        $builder
            ->add(
                'delete',
                'submit',
                [
                    'label' => 'Delete',
                    'attr' => [
                        'class' => "btn-danger",
                        'data-delete' => "Do you really want to delete this element?"
                    ]
                ]
            );
    }

    protected function addAddNextButton(FormBuilderInterface $builder)
    {

        $builder
            ->add(
                'addNext',
                'submit',
                [
                    'label' => 'Save & Add Next',
                    'attr' => [
                        'class' => 'btn-primary',
                        'data-loading-text' => 'Saving ...'
                    ]
                ]
            );
    }
}
