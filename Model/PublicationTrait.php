<?php
namespace Hexmedia\AdministratorBundle\Model;


/**
 * Trait PublicationTrait
 * @package Hexmedia\AdministratorBundle\Entity
 */
trait PublicationTrait
{

    /**
     * @var bool
     *
     * @ORM\Column(name="published", type="boolean")
     */
    private $published;
    /**
     * @var \DateTime
     *
     * @ORM\Column(name="published_from", type="datetime", nullable=true)
     */
    private $publishedFrom;
    /**
     * @var \DateTime
     *
     * @ORM\Column(name="published_to", type="datetime", nullable=true)
     */
    private $publishedTo;

    /**
     * @return boolean
     */
    public function getPublished()
    {
        return $this->published;
    }

    /**
     * @param boolean $published
     */
    public function setPublished($published)
    {
        $this->published = $published;
    }

    /**
     * @return \DateTime
     */
    public function getPublishedFrom()
    {
        return $this->publishedFrom;
    }

    /**
     * @param \DateTime $publishedFrom
     */
    public function setPublishedFrom($publishedFrom)
    {
        $this->publishedFrom = $publishedFrom;
    }

    /**
     * @return \DateTime
     */
    public function getPublishedTo()
    {
        return $this->publishedTo;
    }

    /**
     * @param \DateTime $publishedTo
     */
    public function setPublishedTo($publishedTo)
    {
        $this->publishedTo = $publishedTo;
    }
}