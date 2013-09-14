<?php
namespace Hexmedia\AdministratorBundle\Form\Fields;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\OptionsResolver\OptionsResolverInterface;

/**
 * Class DatepickerType
 * @package Hexmedia\AdministratorBundle\Form\Fields
 */
class DatepickerType extends AbstractType
{
    public function setDefaultOptions(OptionsResolverInterface $resolver)
    {
        $resolver->setDefaults(
            [
                'required' => false,
                'render_optional_text' => false,
                'widget' => 'single_text',
                'widget_addon' => [
                    'type' => 'prepend',
                    'text' => '<span class="icon-calendar"></span>'
                ],
                'format' => 'dd/MM/yyyy'
            ]
        );
    }

    public function getParent()
    {
        return "date";
    }

    public function getName()
    {
        return "datepicker";
    }
}